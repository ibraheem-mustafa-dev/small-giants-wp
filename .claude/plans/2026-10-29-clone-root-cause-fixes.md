# Cloning: fix the root causes behind the cloned sites' faults

**Why (Bean, 2026-10-29):** the three live clones show missing content, dead links, the draft's look not carried, settings that are not plain CSS lost, broken hovers, mega menus unlike the hand-built reference, a split trade application form, static logos, a static vertical Our Story timeline, a missing About background SVG and missing images. The causes are in `.claude/reports/2026-10-29-clone-homepage-root-causes.md` (RC1 to RC16) with Bean's rulings. Every fix is universal (any client, any draft), proven on a real draft, and confirmed by the result matching its goal.

**How:** subagents build in worktrees on `B:/sgs-wt/` (never linking `node_modules` or `cache/`); the main session checks each track's diff and result with `/qc-inline`, merges to `main`, and runs the route suite and gates there. At most three tracks at once; a track that shares files with a running one waits. Order: P, M and D first; then S (after P), T, N (after M), F and W as slots free.

## Progress (2026-10-30)

- Merged to `main` (45492beb8): every track's root causes except RC5's second half. D (RC2, RC4, RC13, the finaliser), W (RC17), M (RC14), F (RC15, RC16, product reconciliation, attribute labels), N (RC10, RC12, the timer call on intake's records), P and P2 (RC1, RC3, RC11, content-identity pairing, Fill's list matcher, the saved-inventory freshness guard, menu items by kind, product-card text paths), T (RC9 and the time-based text option), S (RC6, RC7, RC5 part 1, `skeleton-rules.mjs` split). The framework DB is reseeded from main (`d6714d0c2`). Route suite on `main`: the 5 baseline failures only.
- Calibration memory fault fixed (`0a065c670` and the budget commit; nav-bar-menu then calibrated in 2 hours at a 5.7 GB peak). Calibrated on local-indus after the merges: site-header, site-header-row, nav-drawer, responsive-logo, container, heading, text, label, form-field-checkbox and 13 content blocks; product-card and cart run on local-mamas (they need a product). Every client's default paint is still to measure, after the fresh intakes settle the snapshots.
- The C: drive is full: every command and agent writes its temp files to `B:\sgs-tmp` (calibration's per-site lock lives there too, so every calibration run uses it).
- RC5 part 2 merged (the drawer's sections read as render parts, paired by the data both print; `1ee920691`). Fresh intakes ran on the fixed route (2026-10-30, `905d3d7ae`): Indus 657 skeleton rows (61 changed), Mama's 988 (11), Eye Care 910 (63); the finalise requests hold 18, 182 and 115 low-confidence rows. Next session: `.claude/prompts/Cloning Third Re-clone Prompt.md`.
- Open questions for Bean's review batch: Eye Care's "Pay now" and "£0" inside the pay button became labels (Track M); "pick up to 3" and the per-cookie price are framework gap rows (Track F); the logo's hover bounce and hover speed-up and the hero's per-width SVGs are framework gap rows (Track N); `sgs/timeline.textColourHoverGradient` read as dead on recalibration where the kept slot map places it on the node dot and sparks (both readings look wrong; the kept map stands); `sgs/icon`'s planner offers colour markers to the `colourMode` choice (8 instances refused, benign).

## Track P: pairing (RC1, RC3, RC11)

- Every part a block draws itself is paired with the draft element in that place, from `block_attributes.css_element` and the calibrated part slots (Bean: "the whole point of the block attributes table"); the per-rule pairing in `lib/skeleton-part-slots.mjs` becomes one universal mechanism. Covers the hero's picture frame, list items and their markers, slider slides (`slidesVisible`), icon shapes and the logo's picture.
- An icon list item's own marker or glyph is written to that item (`iconName`/`iconSource`, `markerType`).
- One draft element is one node's: a surface root that holds the form card and an aside (the trade application) makes the form block the card only.
- Spec 48 §3.4 (skeleton output, `draftSlots`) states the universal pairing.

## Track M: one element-facts reader (RC14)

- RC14: one element-facts reader that every skeleton rule reads, each fact from its source under R-47-4: attributes and every event binding from the fact record (`template.attrs`, full, any event); what a handler does from the logic's syntax tree (the existing readers, fed the binding from the record); declared styles from the fact record; resolved values per width (a `clamp()`, `var()` or `calc()` result, and the inherited text properties such as font size, weight, tracking and case) from the inventory's browser read, beside the `display`, `position` and box it already measures. A rule judges a value at every width the element renders unless the rule itself names a platform or a width range (Bean, 2026-10-29); a rule that holds at some widths only sends its row to the review marked width-dependent. The string helpers go, the snippet stays only for the review page, and a lint refuses a skeleton module that reads `snippet` or the raw `style` attribute.

## Track T: content the clock decides (RC9)

- Content the draft computes from the clock (`Date`) is recognised from the code, never from the words it shows when read.
- Framework (Bean, 2026-10-29): a time-based text option on the text blocks (heading, text, label): a list of hour ranges with their words, swapped in the visitor's browser so page caching stays on, with an inspector panel. Clock-driven text the route reads from the code (Mama's time-of-day greeting) maps onto it; business opening status stays `sgs/business-info`'s open-status display.

## Track N: behaviour and injected content (RC10, RC12; after Track M merges, on its reader)

- A behaviour effect is recognised by what it does (its shape, trigger and target), never by words or the draft's own identifiers in names; the pinned-track recogniser keyed on `updatePins`/`data-pin` is replaced.
- Content a draft's code injects (a fetched SVG in a stamped holder or a custom element) is read as that holder's content per width, and the motion on its parts is recorded against the stamped holder and the part's id (METHOD §5.2); the `html:custom-element` coverage entry stops excluding a custom element's internals; the logo and the hero carry it through the framework's inline SVG and motion settings, or a framework gap row names what cannot be carried.

## Track D: data, the container band and the review (RC2, RC13, RC4, the finaliser)

- The seeder reads what a block's own source declares and the DB lacks: a choice setting's allowed values and an array setting's item fields, from the block's source files and the helpers they call (Bean: nothing added to `block.json`); the route chooses values and writes item fields from them.
- RC13 (framework): a container whose height comes from its own aspect ratio or minimum height passes it to its content band, so a child set to fill it fills it (`sgs/container`, `.sgs-container__content-band`); built, deployed and checked live on a filled picture in a sized frame.
- `clientBuiltSurface` is removed: a hand-built post is only a reference to compare a clone against.
- The finaliser is not a separate agent: the agent running the clone makes the low-confidence picks and brings the open points to Bean; Spec 48 §3.4 and the intake docs say so.

## Track F: the flow product (RC15, RC16)

- A choice-flow question whose options are the terms of one attribute of the flow's product is written as that attribute's product-option step (`productAttribute`, Spec 43 FR-43-10): its options, prices, badges and stock come from the product, and the hand-over to the add-on price list (FR-43-17) is made only for prices the product does not hold. The flow's product is the catalogue product its basket call adds (`lib/site-build-flow-product.mjs`), read through the logic's syntax tree instead of the regex over the script.
- The catalogue makes only the priced choice a variation axis; every other choice, the multi-choice included, is a product attribute that creates no variations and travels as an answer (Spec 43 FR-43-7); Spec 48 FR-48-92 says so. The draft's "pick up to 3" (a question taking several options) is a framework gap row for Bean.

## Track W: brand colours stay in the block (RC17)

- WhatsApp leaves the theme palette: `sgs/whatsapp-cta` paints its ground from the brand registry like the icon block's brands, with its colour settings as the way a client or a clone changes it; the extractor and intake never propose a brand registry colour, or a token the draft paints only on a brand's own control, as a palette colour, and a draft's brand tokens (`--wa-*`) map onto that block's colour settings as one-off values; every client snapshot's `whatsapp*` slugs go (`push-theme-snapshot.py` to each test site).

## Track S: structure (after Track P merges; shares skeleton files)

- RC6: a loop of disclosure toggles over conditional panels is `sgs/accordion`.
- RC5: a block's settings drawn in a second surface (the mega panel's drawer look) are read from that surface.
- RC7: the hover hold keeps a gradient ground with its text colour (prove the mechanism with a failing test first: it is read from the code, not yet reproduced).

## Then

The calibration cache rebuilt on every client mirror, fresh intakes, then a build and full walk of each client on its mirror; every remaining difference is listed by cause for Bean before the third re-clone.
