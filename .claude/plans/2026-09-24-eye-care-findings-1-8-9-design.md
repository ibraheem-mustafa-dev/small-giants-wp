# Eye Care findings 1, 8 and 9: converter design (2026-09-24)

Status: C1 to C4 approved by Bean 2026-09-24. C2 BUILT (0deb3b10b). C1, C3, C4, C5 PAUSED by D1149: they
resume in Phase 7 of `plans/2026-09-24-eye-care-hand-build-design.md`, tested against the hand-built site.
The sections below are the design as approved; read the two review sections at the end before building.
Audit: `reports/visual-diff/eye-care-home-audit-2026-09-24.md`. Evidence run:
`pipeline-state/eye-care-ward-end-eye-care-birmingham-2026-09-24-000044` (v2 draft).

## What the visitor loses today, and why (each cause reproduced on the real draft node)

| # | Loss on the live page | Proven cause |
|---|---|---|
| 1 | The hero is an empty dark band: no photo, no headline, no buttons | `converter/services/extraction.py::run_mechanism_b` routes a composite's direct children by their BEM `__element` class. The Eye Care hero's four children have no class, so each becomes a "composite-interior column has no BEM __element" gap and nothing is emitted. |
| 2 | The "Any pair here" photo is missing | The `<img>` is tag-swapped to `sgs/media` (atomic) and its styling transfers, but the image never lifts. `converter/walk.py::run_universal_content_walk` only runs the element-self lift (`run_mechanism_leaf`) when the block has ONE unambiguous primary content attribute. `sgs/media` has several (image, video, caption), so `primary_content_attr` returns None and the lift is skipped. Run directly on the node, the lift returns the correct URL and alt. |
| 3 | The three numbered steps show the block's placeholder rows ("First list item…") | `converter/resolvers/array_content.py::_find_item_nodes` finds list items only as sibling elements sharing a BEM class. Plain `<li>` rows have none, so it finds 0 items and the block keeps its default items. |
| 4 | "How lenses work here", "Message me on WhatsApp" and "My qualifications" are plain text, not buttons | `converter/services/text_leaf.py::node_is_text_leaf` treats a `<div>` as a text paragraph unless a child's tag is on a fixed block-level list. `<button>` and `<a>` are not on it, so a `<div>` holding only buttons becomes one `sgs/text`. (The `<button>` on its own already converts to `sgs/button` correctly.) |
| 5 | The optician photo panel is a thin strip of text | Same cause as 4: the panel is a flex column holding two `<span>`s, so it is read as one paragraph and its box (background, border, centring, 4:5 shape) is lost. |

## The design: four small changes, all universal, no new stage

**C1. Classless children of a composite get their role from their shape (finding 1).**
In `run_mechanism_b`, where a column has no `__element`, the converter works out the role it would
have had, then sends it down the existing branch for that role. Checked in order, from the node's own
CSS and content (no class names, rule R-31-2):
- **Background media layer:** covers the section (absolutely positioned with an inset) and holds one
  image or video, no text → the block's background-image slot, found in the DB by
  `canonical_slot='background-image'` (sgs/hero: `backgroundImage`). A media child that does NOT cover
  the section keeps today's split-media branch.
- **Overlay layer:** covers the section, no children, no text, only a background → the block's overlay
  slot (DB `canonical_slot='overlay'`: `overlayGradient` / `backgroundOverlayColour`).
- **Content column:** holds text → the existing content-wrapper branch (C): its box CSS folds into
  the block's content settings (`contentPadding`, `contentWidth`), and its children become inner blocks
  (label, heading, paragraph, buttons).
- Anything else stays a reported gap, as now.

If the block has no slot for a role (the DB has no such row), that child is reported, never
guessed. The role is used only inside the converter and is never written onto the page (rule 1).
It applies to every composite with those slots, not only the hero (rule 3).

**C2. A tag-swapped element lifts its own content (finding 8, photo).**
The leaf fallback's gate gains one condition: when the node was recognised by its tag (an `<img>`
becoming `sgs/media`), the node IS the element, so the element-self lift runs even when the block
has several content attributes. That lift already takes at most one image, one text and one link, so
it cannot over-fill.

**C3. `<li>` rows of a plain `<ul>`/`<ol>` are the list's items (finding 8, steps).**
When no BEM-classed group exists and the node is itself a `<ul>` or `<ol>`, its direct `<li>` children
are the items (HTML defines them, so this is not guesswork). Each item's text is the `<li>`'s own
text. For an `<ol>`, `markerType` becomes `numbered`, which renders a real `<ol>`. A leading child whose
text equals the item's position ("1", "2", "3") is the visible number and is not repeated in the
text. The tag-to-marker mapping lives in a data file beside `atomic-tag-map.json`, not in code (R-31-1).

**C4. Buttons, links and arranged boxes are never flattened into a paragraph (findings 8 and 9).**
`node_is_text_leaf` gains two rules:
- A child whose tag the DB maps to a block that cannot hold text (`<button>`, `<a>` → `sgs/button`)
  is its own block, UNLESS it sits inside running text (the parent has loose text of its own). A
  link inside a sentence stays a link in the paragraph.
- A node whose own CSS arranges its children (flex or grid) and has two or more element children and
  no loose text is a layout box, not a paragraph.

Result: the button rows become an `sgs/container` (flex, the draft's gap) holding real `sgs/button`s.
The optician panel becomes an `sgs/container` with its background, border and centring, holding two
text blocks.

## What stays open after this (each reported per item, never silent, rule 4)

- **Values held in draft bindings:** hero height (`{{ heroH }}`), the two overlay gradients,
  image focus and content padding. These need the draft-script evaluator (plan Track A1). Until then
  the hero is only as tall as its content, and the overlay is the section's dark background alone.
- **Button destinations:** the draft's buttons navigate with script handlers (`goLenses`, `goAbout`),
  not links. The manifest records links per screen, not per button, and there are no Eye Care pages yet
  to link to. Each such button is emitted without a URL and reported with its handler name (Track D).
- **Hero photo zoom and parallax, the button hover styles** (`style-hover`, plan Track A item).
- **The optician panel's 4:5 shape:** `sgs/container` has no aspect-ratio setting, so this is reported
  as "no destination". The question for you is below.
- **Numeral styling** (Playfair, tan colour) on the list: reported if `sgs/icon-list` has no marker
  font or colour setting.

## How each change is proved

1. **Unit tests, one per change, each with a negative control** that must fail without the change:
   - C1: a classless hero converts to background image + content inner blocks; an in-flow image stays
     split media.
   - C2: a bare `<img>` fills `imageUrl` and `imageAlt`.
   - C3: `<ol><li>` gives three items and `numbered`; a `<ul>` of BEM items is unchanged.
   - C4: `<div><button>` gives a button; `<p>text <a>link</a></p>` stays one paragraph.
2. **Regression control:** convert the Mama's draft before and after. The markup should be identical;
   any difference is listed and explained before commit.
3. **`/qc-council`** (two models) on the diff before each converter commit.
4. **Live, per the draft-vs-live method:**
   - re-clone page 11 from the v2 draft (the LEDGER command), deploy, then compare at 1440, 768 and 375
     with screenshots side by side;
   - pass: the hero photo, headline and both buttons show; the about-strip photo, three steps and button
     show; the optician panel is a box and both buttons are buttons;
   - checked by Playwright `innerText` and computed styles, and by looking.

Order: C2, then C4, C3, C1 (smallest first; C1 is the largest). One commit each, straight to `main`.

## Bean's review (2026-09-24) and the resulting changes

- **C1 to C4 approved.**
- **"Couldn't the default container fix the hero, open items included?"** `sgs/container` carries the
  same background set as `sgs/hero` (backgroundImage, overlayGradient, bgKenBurns, bgParallax;
  checked in the DB), per the composite-mirror rule. But the container's descent has the same gap: it
  would turn the photo layer into a nested container holding an image, and the empty overlay layers
  into empty containers. So **C1's shape rule moves to the shared routing both paths use**. A
  classless section recognised as the default container then gets the same background and overlay
  routing as the hero. The section stays `sgs/hero` because the draft names it `sgs-hero` (rule 1, and
  the client keeps the hero's editor controls). The open binding values (`heroH`, gradients, focus,
  padding) are not a routing problem on either path: they sit in the draft script
  (`heroH: mobile ? '82vh' : 'min(84vh, 820px)'`), which the built-but-unwired evaluator reads
  (Track A1).
- **Aspect ratio.** The draft does declare it: `aspect-ratio:4/5` on the optician panel only, the
  same at every width (no binding), and 13 elements in the draft use aspect-ratio. Proposal: an
  `aspectRatio` setting on `sgs/container`:
  - empty by default, so it does nothing unless set;
  - set only when the draft's element declares it;
  - per device tier, like every other container setting;
  - scoped to that one block, never the page.
  That transfers the draft's own mechanism rather than inventing one. Awaiting Bean's confirmation.
- **Links (new C5).** 404s on a test site are harmless, and the destinations are knowable
  deterministically:
  - `draft-manifest/dc_script.py::analyse_handler` resolves each handler to its view
    (`goLenses` → lenses, `goSun` → shop, `goAbout` → about);
  - the draft's embedded `data-sgs-manifest` gives each view's route (`/lenses`, `/sunglasses`,
    `/about`).
  C5 writes that route as the button's URL and logs each one as a pre-registry link, so Track D can
  rewrite them when the real pages exist. A handler that resolves to no single view stays reported.

## Second review (2026-09-24): two corrections

- **The evaluator is already on.** It has been on by default since D1132, via
  `orchestrator/script_bindings_stage.py` (opt-out `--no-script-bindings`). The evidence run resolved
  75 names, including `heroH`, `heroGrad`, `heroScrim`, `heroPos` and `heroPad` per tier. The earlier
  line calling it "built-but-unwired" was wrong. So the hero's values are lost only because C1's
  children are dropped. Once C1 routes them, they arrive resolved. Two exceptions:
  - `heroGrad` and `heroScrim` differ per tier, but the hero's `overlayGradient` is not responsive,
    so the tablet and mobile values are reported;
  - the section's `height: {{ heroH }}` is resolved, but the hero has only `minHeight` and no
    `height`. The miss appears only in the convert trace (`attr_for_layer_property_miss`), NOT in the
    run's content gaps: a Rule 4 reporting hole.
- **Aspect ratio: nothing was lost.** Evidence:
  - `git log -S AspectRatio` over the container block, the wrapper includes and the shared components
    shows no container aspect-ratio ever added or removed;
  - the Mama's homepage clone artefacts carry no aspect value;
  - the aspect settings that exist are on image-bearing blocks: `sgs/card-grid.aspectRatio`, which
    sets the card image's ratio and has a live editor control, plus `sgs/media`, `sgs/gallery`,
    `sgs/post-grid` and hero split-media.
  Mama's draft puts `aspect-ratio` on image wrappers (`.product-card-image` 4/3, `.story-image` 4/5).
  The optician panel is the same shape: a stand-in for "Photo of the clinic".

## Questions for Bean (original)

1. **Approve C1 to C4 as designed?** Recommended: yes.
2. **The optician panel's 4:5 shape.** Options:
   - **(a) Recommended:** add an `aspectRatio` setting to `sgs/container`. `sgs/media` already has one,
     so the pattern exists. It is a shared-wrapper change, so it gets its own short design check after
     C1 to C4.
   - **(b)** Leave it reported. The panel keeps its box, but its height comes from its text.
3. **Button destinations:** leave them reported until Track D builds the page links (recommended), or
   point each at its screen's README route now, which would 404 until those pages exist.
