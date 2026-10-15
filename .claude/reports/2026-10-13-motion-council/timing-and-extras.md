# Timing and extras census (proposals 3, 5a to 5d)

Method: every record with `mechanism: css-transition` in the three `animations.json` files (Eye Care 97, Indus 125, Mama's 138 = 360; triggers are hover, focus or state). Per-property duration, delay and easing were read from `properties[]`, falling back to the record-level value. Movement = transform, translate, rotate, scale, opacity, filter, plus layout moves (padding, gap, width, left), which a movement owner would carry. Paint = colour, background, border, box-shadow, text-stroke colour. Instant `css-pseudo` hover records and non-transition hover records (Eye Care 16, Indus 20, Mama's 32) carry no timing and are excluded. Record ids repeat across drafts, so cite them as draft/id. Scripts: `council/census2.py`; id lists per class: `council/lists.json`.

## (3) Per-property hover timing

| Draft | Transition records | One timing for every property | Split, two groups reproduce exactly | Split WITHIN a group | Colour snaps (0 ms) beside an animated property |
|---|---|---|---|---|---|
| Eye Care | 97 (78 hover, 19 state) | 79 | 0 | 7 | 11 |
| Indus | 125 (101 hover/focus, 24 state) | 53 | 61 | 11 | 0 |
| Mama's | 138 (115 hover, 23 state) | 54 | 84 | 0 | 0 |
| Total | 360 | 186 (51.7%) | 145 (40.3%) | 18 (5.0%) | 11 (3.1%) |

Exact reproduction by one extra (paint) row: 186 + 145 = 331 of 360 (91.9%). Not exact: 29 (8.1%), all in Eye Care and Indus. Delays are 0 on every property except Indus/TR-016 (40 ms), so the real splits are duration and easing.

The second row must carry easing, not only duration. In the 145 two-group splits the movement owner uses a spring or custom curve (`cubic-bezier(.34,1.56,.64,1)`, `cubic-bezier(.3,1.6,.5,1)` and similar) while paint uses `ease`, often with equal durations (Mama's/TR-006: transform 300 ms spring, box-shadow 300 ms ease). A duration-only row would have failed those 84 Mama's records.

Two-group records (exactly reproduced), by draft:
- Indus (61): TR-004, 005, 006, 007, 014, 018, 019, 021, 022, 023, 030, 035, 037, 038, 039, 040, 041, 042, 045, 046, 047, 048, 052, 053, 054, 055, 059, 061, 062, 063, 064, 066, 069, 070, 072, 076, 077, 080, 081, 083, 087, 091, 093, 094, 095, 096, 097, 098, 099, 100, 101, 103, 106, 109, 111, 115, 116, 118, 119, 120, 125. Of these, TR-054, TR-069 and TR-101 pair a layout move (gap, padding-left) with colour or background, so they only reproduce if layout moves are counted as movement owners; TR-087, TR-096 and TR-109 are state triggers.
- Mama's (84): TR-001, 002, 006, 007, 008, 009, 010, 011, 015, 016, 018, 022, 026, 027, 028, 029, 031, 032, 033, 034, 038, 041, 043, 044, 045, 047, 048, 054, 058, 059, 060, 061, 062, 063, 065, 066, 067, 068, 069, 070, 071, 074, 075, 076, 077, 078, 079, 080, 081, 082, 083, 084, 085, 086, 087, 089, 090, 091, 092, 093, 094, 095, 097, 098, 099, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 122, 137, 138 (TR-105 to 111 pair padding with colour).
- Eye Care: none.

Within-group splits (18):

Paint group (15):
- Eye Care/TR-14: border-color 300, box-shadow 400 (transform 400).
- Eye Care/TR-60, TR-62, TR-64: border-color 250, box-shadow 300 (transform 250).
- Eye Care/TR-72: border-color 300, box-shadow 400 (transform 400).
- Indus/TR-001, TR-002, TR-003, TR-051: box-shadow 250, background and colour 200 (transform 200).
- Indus/TR-012, TR-013, TR-073: box-shadow 250, background and colour 200 (transform 250, custom curve).
- Indus/TR-102: box-shadow 250, background 200 (transform 250, custom curve).
- Indus/TR-043: background 250, box-shadow 300 (transform 350, spring).
- Indus/TR-082: background 200, box-shadow 300 (transform 200). Worst error if the paint group takes one value: 100 ms (Eye Care/TR-14, TR-72; Indus/TR-082); the other 12 are 50 ms.

Movement group (3):
- Eye Care/TR-30: transform 900, filter 400 (product image zoom plus filter).
- Eye Care/TR-73: transform 900 (`cubic-bezier(.2,.7,.2,1)`), filter 400.
- Indus/TR-074 (state): opacity 400 `ease`, scale 500 `cubic-bezier(.2,.8,.2,1)` (timeline card, an entrance-style state change, not a hover). Worst error: 500 ms (TR-30, TR-73).

Colour snaps (11, Eye Care only): TR-22, 36, 41, 43, 52, 55, 59, 61, 63, 65, 68. The draft's `transition:` lists `background` (and sometimes `transform`) but not `color`, while `style-hover` changes `color`, so the text colour jumps instantly while the background animates (TR-22: `transition:transform .25s,background .25s` with `style-hover="…color:#0B2B17"`). One paint row would animate the colour over 250 ms instead. That is a colour-only difference and almost certainly an oversight in the draft, not intent.

Verdict (3): ONE EXTRA ROW VALIDATED as the right shape, with a stated residual. It reproduces 331 of 360 (91.9%) exactly, including every Mama's record. The 18 within-group splits are real but small (15 paint records at 50 to 100 ms; 3 movement records, two at 500 ms on one Eye Care image-zoom pattern). Per-property timing would be exact but needs a field per property for under 5% of records. The row needs duration, delay and easing and covers colour, background, border and box-shadow. Smallest change: `plugins/sgs-blocks/schemas/motion.schema.json::$defs/HoverStateValues` gains the paint-timing fields (and Spec 38A §5.1 and §6.2's hover-values sentence names them). Caveat: HoverStateValues today has no colour or shadow property (§13.2 keeps those in their styling controls), so the row needs a named reader that emits the `transition` for those owners before it is built.

## (5a) Stagger wrap after N

Occurrences: 1 record, 1 draft. Indus/A-09 ("Grid / wrap item reveal"): `delay_ms: (i % 8) * 80`, step 80, cap 560, 800 ms, `cubic-bezier(.16,.84,.32,1)`, in `setupReveal` (source: `k._rv = { kind: 'item', i: i % 8 }`), about 42 template targets. The other staggers do not wrap: Eye Care/J-02 `min(i,7) x 70` (cap 490, already covered by FR-38A-51(b)), Mama's/A-04 (90 ms, cap 360), Indus/A-12, A-14, A-39 (capped ladders). A search of the `.dc.html` and `.js` sources for modulo delays found only that one line.

Governing code: `plugins/sgs-blocks/src/components/motion/stagger-delays.js::computeStaggerDelays` already restarts at each line when `columns > 1` (position = `i % columns`), but `columns` comes from the container's stored grid columns (§8), not from a wrap value. A wrap is therefore not one entry in `STAGGER_ORDERS` (an order maps a grid to positions and has no N); it is an override of the restart width. A 4-column grid gives `i % 4` today, so A-09 is not otherwise reproducible. Smallest change: an optional `wrapAt` integer on `motion.schema.json::$defs/Stagger` and in `computeStaggerDelays`, used as `columns` when set (a few lines, no new order, plus the PHP mirror `includes/motion/class-sgs-motion-stagger.php`).

Verdict (5a): ONE-DRAFT quirk. Valid and cheap, but defer unless Bean wants A-09 exact for lists above 8 items; for 8 or fewer items the existing cap reproduces it.

## (5b) Ambient float: axis both, plus breathe scale

Two-axis float: Indus/A-40 (live, `bindRings`, 8 template elements): translate `0 0` to `{dx}px {dy}px`, dx and dy random within +/-18 px per ring, 7000 + random x 6000 ms, `ease-in-out`, infinite alternate, negative random delay. Indus/A-03 also moves on both axes (x +/-5, y -6 to -18) but its notes say it is dead code (density hard-coded off). Live count: 1 record, 1 draft. The other floats are y only: Indus/A-16 (translateY -12, 4200 ms), Indus/A-17 (translate 0 -12px, unused), Mama's/A-03 (keyframed `0 0`, `0 -10px`, `0 0`, 3200 ms). Eye Care has no float.

Scale breathing: Indus/A-40 (scale 1 to 1.05..1.12 per ring, same loop). Related but a different pattern: Mama's/A-02 sparkle twinkle (scale 1, 1.35, 1 with rotate 0, 90, 180 deg, 2400 ms, three keyframes, not alternate). Exact matches: 1 record, 1 draft.

Governing text: FR-38A-37 and `motion.schema.json::$defs/AmbientFloatValues` (`axis` enum is `x`, `y`; no scale field). The effect has no runtime yet (`git grep` finds no ambient-float code under `src` or `includes`), so nothing built needs rewriting. Smallest change: add `both` to `AmbientFloatValues.axis.enum` and an optional `breathe` ratio field to `AmbientFloatValues.properties`, with `travel` read per axis; per-ring random values are stored per element as the spec already requires for phase.

Verdict (5b): ONE-DRAFT, cheap because the effect is unbuilt. Add `both` now; hold `breathe` until a second draft needs it (Mama's/A-02 would not use it, being a rotate-and-scale keyframe loop).

## (5c) Caret or chevron turn on open

Occurrences: 10 records across all 3 drafts, each a state-driven `transform` transition on a caret, chevron or plus glyph:
- Eye Care: TR-24 (shop filter-group chevron, rotate 180 from `fgOpen`, 300 ms), TR-38 (product tab "+", rotate 45, 300 ms), TR-42 (help FAQ "+", rotate 45 from `faqOpen`, 300 ms).
- Indus: TR-011 (header nav caret, `caret: isActive ? 180 : 0`, 300 ms `cubic-bezier(.16,.84,.32,1)`), TR-027 (drawer accordion caret, `accCaret` 180, 450 ms spring), TR-089 (FAQ plus, `rot: open ? 45 : 0`, 300 ms), TR-117 (TradeApplication chevron, `ckRot` 180, 300 ms).
- Mama's: TR-025, TR-040, TR-073 ("+" glyph turn, 300 ms, `cubic-bezier(.3,1.6,.5,1)`; the turn angle was not read). Recurring need: yes.

Governing text: FR-38A-51 does not mention a caret turn. The turn belongs to FR-38A-53, which names accordion and disclosure icon turns and a chevron `rotate(180deg)`. The nav-drawer-menu caret exists today as `plugins/sgs-blocks/src/blocks/nav-drawer-menu/block.json` `itemExpanderRotate` (a `css:transform` on `.sgs-nav-drawer-menu__caret`) plus `submenuCaretTurnDuration/Easing`, which Spec 38A does not map. No schema change is needed: `EntranceTo.rotate` and `EntranceBase.trigger` (`open`, `state`) already express "rotate to 180 on open" on a declared part. Smallest change: in `.claude/specs/38A-SGS-MOTION-MODEL.md` FR-38A-53, name the nav-drawer-menu caret part (`caret-box` in its `block.json` elements) with `itemExpanderRotate` and `submenuCaretTurn*` as migrating inputs, and add rotate 180 and 45 to the done-when.

Verdict (5c): VALIDATED as a recurring need (3 of 3 drafts), already covered by the schema; a spec mapping line only, filed under FR-38A-53, not FR-38A-51.

## (5d) Pinned-timeline active year outline colour

Occurrences: 1 record pair, 1 draft. Indus/J-07 (scroll-position, `updatePins`: `color` transparent to `#D8CA50`, `-webkit-text-stroke-color` `#0A7EA8` to `#D8CA50`, 500 ms `ease`) and its transition record Indus/TR-075 (`transition:color .5s,-webkit-text-stroke-color .5s`). The only other text-stroke uses are static (Indus inactive year at 1.5px; Mama's Home sparkle glyph).

Governing text: FR-38A-38 says "the active panel's year changes fill colour through the active state". `git grep -in "text-stroke\|textStroke" -- plugins/sgs-blocks/src plugins/sgs-blocks/includes` finds nothing: SGS has no text outline control at all, so there is nothing for M5.5 to switch. Adding the stroke colour to M5.5's active-state values presupposes a control that does not exist.

Verdict (5d): ONE-DRAFT quirk, and FALSIFIED as an M5.5 addition (wrong place). The correct smallest change is outside Spec 38A: a text outline styling control (width plus colour) on the text blocks. Once it exists, the active-state `to` values take its colour reference like any other colour (FR-38A-53, built in M5.17). Park it; it does not block the timeline's fill colour change.
