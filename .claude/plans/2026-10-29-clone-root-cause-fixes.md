# Cloning: fix the root causes behind the cloned sites' faults

**Why (Bean, 2026-10-29):** the three live clones show missing content, dead links, the draft's look not carried, settings that are not plain CSS lost, broken hovers, mega menus unlike the hand-built reference, a split trade application form, static logos, a static vertical Our Story timeline, a missing About background SVG and missing images. The causes are in `.claude/reports/2026-10-29-clone-homepage-root-causes.md` (RC1 to RC11) with Bean's rulings. Every fix is universal (any client, any draft), proven on a real draft, and confirmed by the result matching its goal.

**How:** subagents build in worktrees on `B:/sgs-wt/` (never linking `node_modules` or `cache/`); the main session checks each track's diff and result with `/qc-inline`, merges to `main`, and runs the route suite and gates there. At most three tracks at once; a track that shares files with a running one waits.

## Track P: pairing (RC1, RC3, RC11)

- Every part a block draws itself is paired with the draft element in that place, from `block_attributes.css_element` and the calibrated part slots (Bean: "the whole point of the block attributes table"); the per-rule pairing in `lib/skeleton-part-slots.mjs` becomes one universal mechanism. Covers the hero's picture frame, list items and their markers, slider slides (`slidesVisible`), icon shapes and the logo's picture.
- An icon list item's own marker or glyph is written to that item (`iconName`/`iconSource`, `markerType`).
- One draft element is one node's: a surface root that holds the form card and an aside (the trade application) makes the form block the card only.
- Spec 48 §3.4 (skeleton output, `draftSlots`) states the universal pairing.

## Track M: what the draft's code does (RC9, RC10, RC12, RC14)

- Content the draft computes from the clock (`Date`) is recognised from the code, never from the words it shows when read.
- Framework (Bean, 2026-10-29): a time-based text option on the text blocks (heading, text, label): a list of hour ranges with their words, swapped in the visitor's browser so page caching stays on, with an inspector panel. Clock-driven text the route reads from the code (Mama's time-of-day greeting) maps onto it; business opening status stays `sgs/business-info`'s open-status display.
- A behaviour effect is recognised by what it does (its shape, trigger and target), never by words or the draft's own identifiers in names; the pinned-track recogniser keyed on `updatePins`/`data-pin` is replaced.
- RC14: one element-facts reader that every skeleton rule reads, each fact from its source under R-47-4: attributes and every event binding from the fact record (`template.attrs`, full, any event); what a handler does from the logic's syntax tree (the existing readers, fed the binding from the record); declared styles from the fact record; resolved values per width (a `clamp()`, `var()` or `calc()` result, and the inherited text properties such as font size, weight, tracking and case) from the inventory's browser read, beside the `display`, `position` and box it already measures. A rule judges a value at every width the element renders unless the rule itself names a platform or a width range (Bean, 2026-10-29); a rule that holds at some widths only sends its row to the review marked width-dependent. The string helpers go, the snippet stays only for the review page, and a lint refuses a skeleton module that reads `snippet` or the raw `style` attribute.
- Content a draft's code injects (a fetched SVG in a stamped holder or a custom element) is read as that holder's content per width, and the motion on its parts is recorded against the stamped holder and the part's id (METHOD §5.2); the `html:custom-element` coverage entry stops excluding a custom element's internals; the logo and the hero carry it through the framework's inline SVG and motion settings, or a framework gap row names what cannot be carried.

## Track D: data, the container band and the review (RC2, RC13, RC4, the finaliser)

- The seeder reads what a block's own source declares and the DB lacks: a choice setting's allowed values and an array setting's item fields, from the block's source files and the helpers they call (Bean: nothing added to `block.json`); the route chooses values and writes item fields from them.
- RC13 (framework): a container whose height comes from its own aspect ratio or minimum height passes it to its content band, so a child set to fill it fills it (`sgs/container`, `.sgs-container__content-band`); built, deployed and checked live on a filled picture in a sized frame.
- `clientBuiltSurface` is removed: a hand-built post is only a reference to compare a clone against.
- The finaliser is not a separate agent: the agent running the clone makes the low-confidence picks and brings the open points to Bean; Spec 48 §3.4 and the intake docs say so.

## Track S: structure (after Track P merges; shares skeleton files)

- RC6: a loop of disclosure toggles over conditional panels is `sgs/accordion`.
- RC5: a block's settings drawn in a second surface (the mega panel's drawer look) are read from that surface.
- RC7: the hover hold keeps a gradient ground with its text colour (prove the mechanism with a failing test first: it is read from the code, not yet reproduced).

## Then

The calibration cache rebuilt on every client mirror, fresh intakes, then a build and full walk of each client on its mirror; every remaining difference is listed by cause for Bean before the third re-clone.
