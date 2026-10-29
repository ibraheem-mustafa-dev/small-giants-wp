# Cloning: fix the root causes behind the cloned sites' faults

**Why (Bean, 2026-10-29):** the three live clones show missing content, dead links, the draft's look not carried, settings that are not plain CSS lost, broken hovers, mega menus unlike the hand-built reference, a split trade application form, static logos, a static vertical Our Story timeline, a missing About background SVG and missing images. The causes are in `.claude/reports/2026-10-29-clone-homepage-root-causes.md` (RC1 to RC11) with Bean's rulings. Every fix is universal (any client, any draft), proven on a real draft, and confirmed by the result matching its goal.

**How:** subagents build in worktrees on `B:/sgs-wt/` (never linking `node_modules` or `cache/`); the main session checks each track's diff and result with `/qc-inline`, merges to `main`, and runs the route suite and gates there. At most three tracks at once; a track that shares files with a running one waits.

## Track P: pairing (RC1, RC3, RC11)

- Every part a block draws itself is paired with the draft element in that place, from `block_attributes.css_element` and the calibrated part slots (Bean: "the whole point of the block attributes table"); the per-rule pairing in `lib/skeleton-part-slots.mjs` becomes one universal mechanism. Covers the hero's picture frame, list items and their markers, slider slides (`slidesVisible`), icon shapes and the logo's picture.
- An icon list item's own marker or glyph is written to that item (`iconName`/`iconSource`, `markerType`).
- One draft element is one node's: a surface root that holds the form card and an aside (the trade application) makes the form block the card only.
- Spec 48 §3.4 (skeleton output, `draftSlots`) states the universal pairing.

## Track M: motion, time and media (RC9, RC10, the logo, the About and Our Story pages)

- Content the draft computes from the clock (`Date`) is recognised from the code, never from the words it shows when read (the open/closed pill and its line).
- A behaviour effect is recognised by its shape and the element it sits on, never by words in a record's name (the open-status wave).
- The Indus logo (header and footer) keeps the draft's own SVG file and its motion from `indus-logo.js` (the spin, the hover speed-up, the entrance) through the framework's animated logo feature.
- Root-cause and fix: the About page's large background SVG is missing; the Our Story timeline is static and vertical where the draft scrolls it sideways (GSAP); images are missing on Our Story.

## Track D: data and the review (RC2, RC4, the finaliser)

- The seeder reads a choice setting's allowed values from the block's own source files and the helpers they call (Bean: no lists added to `block.json`); the route chooses from them (`sgs/icon-list.markerType` and the other 138).
- `clientBuiltSurface` is removed: a hand-built post is only a reference to compare a clone against.
- The finaliser is not a separate agent: the agent running the clone makes the low-confidence picks and brings the open points to Bean; Spec 48 §3.4 and the intake docs say so.

## Track S: structure (after Track P merges; shares skeleton files)

- RC6: a loop of disclosure toggles over conditional panels is `sgs/accordion`.
- RC5: a block's settings drawn in a second surface (the mega panel's drawer look) are read from that surface.
- RC7: the hover hold keeps a gradient ground with its text colour.

## Then

The calibration cache rebuilt on every client mirror, fresh intakes, then a build and full walk of each client on its mirror; every remaining difference is listed by cause for Bean before the third re-clone.
