---
doc_type: implementation-plan
project: small-giants-wp
spec_id: 36+37 (merged execution track), cloning pipeline
status: READY TO START (brief, not a design)
parent_plan: .claude/plans/2026-09-21-wave-3c-implementation-plan.md (Gate 3C item 4, U-18)
---

# Reference capture: know what we are copying before we build it

## Problem

Gate 3C item 4 asks for two header copies that are 100% visual copies of their references: lamalama's floating
pill (copy on sandybrown page 4446, `/qa-copy-lamalama/`) and Bean's Indus Foods mega-menu draft (copy on page 4465,
`/qa-copy-indus/`). On 2026-09-27 the copies were reported as passing (lamalama 75/76, Indus 23/23). Bean's review
the same day found them far off: wrong text sizes, every hover colour, the motion, mega-panel spacing, and the
drawer's element order.

## Proven cause

`plugins/sgs-blocks/scripts/nav-qa/u18-copy-probe.mjs` measures box positions and widths only. It reads no type
styles, no hover state, no transition or animation, and no element order, and it never parsed the Indus draft's
stylesheet. Its PASS proved the boxes, nothing else; the report `reports/visual-diff/u18-copy-parity-2026-09-27.md`
is geometry-only.

The repo already has a walker that reads what the probe missed: `scripts/parity/draft-live-walk.mjs` (computed
styles, hover end states, running motion right after each action, structure and order, click-driven states,
side-by-side shots that each need a review note; gap classes in `scripts/parity/GAP-CHECKLIST.md`; per-page
configs such as `sites/eye-care-ward-end/build/qa/parity/shop.mjs`). It was built for the Eye Care shop and has
never been pointed at a header.

## Bean's review, 2026-09-27 (the gaps to close or accept)

Local screenshots (gitignored): `reports/visual-diff/u18-bean-review-2026-09-27/` (reference left, copy right).

**lamalama** (same at 1440, 768 and 375 unless noted):
- L1 open: the "What we do" item's right-hand glyph is wrong.
- L2 open: "Careers" is missing its right-hand glyph.
- L3 open: the "This is Us" GIF/video in a circle frame, above the "This is Us" label at the bottom centre, is missing.
- L4 open: hover on items: a stylised block/bullet appears on the left; hover colours differ.
- L5 open: hover on the drawer buttons scrambles the text (like the framework's GSAP scramble).
- L6 open: item text fades in from below when the menu opens.
- L7 open: the drawer slides open quickly from the pill; ours fades with a small slide.
- L8 closed: the pill, burger and text are scaled down (the logo is right, so the top gap is too small), and the
  reference scales with the viewport width while ours is a fixed size.
- L9 closed: the pill's text should also open the menu (it blocks the click now).
- L10 375: the pill's middle text is hidden on the reference.
- Accepted: the "GET IN TOUCH" corner card (DEC-18; parked in `2026-09-27-g8-screen-corner-pin-plan.md`).

**Indus** (draft: `sites/Indus Foods Mega Menu Design/Indus Foods Mega Menu.dc.html`):
- I-1 desktop: text sizes, every hover colour, the chevron hover, and all motion are wrong.
- I-2 mega panels: padding, alignment, sizing, hover colours and hover motion are wrong. In the About panel the
  reference puts the heritage feature card first (dark ground, photo, "SINCE 1994" tag, "Read our story" link) and
  the numbered links below it on the header blue; ours puts the links on a cream ground and the card below them.
- I-3 drawer (768 and 375): the reference opens with the logo and a boxed close button, then a full-width
  "Become A Trade Customer" CTA with round email and phone buttons, then the menu with large items and yellow
  hairlines, then four round coloured socials centred at the bottom. Ours has no logo, a bare close, smaller items,
  the CTA and icons below the menu, and broken socials.

## Method (Bean, 2026-09-27): prove the walker against a hand-read diff, then extend it

The walker becomes the one tool for headers and footers, on this track and on the Eye Care track (whose page
configs already live in `sites/eye-care-ward-end/build/qa/parity/`). Steps:

1. **Hand-read baseline.** Read each reference directly (the Indus draft's markup and stylesheet rule by rule;
   lamalama's live DOM and computed styles in a headed browser) and write the diff by hand: full structure and
   element order, the contents of each element, its appearance and styling, and its behaviour (hover, open/close,
   motion) at 375, 768 and 1440. Bean's L1-L10 and I-1 to I-3 above are the floor this diff must reach.
2. **Walker run.** Write a config per copy and run `draft-live-walk.mjs` against the same pages.
3. **Compare the two diffs.** For every row: did the walker find it, miss it, or find more? A miss is a walker gap.
4. **Extend the walker** for every miss, most likely as a header/footer mode (drive burger, panel and drawer
   states; hover every item; read entrance and open/close motion; check viewport-scaled sizing across widths;
   read element order inside the drawer and panels). A miss is treated as an exception only when it is genuinely
   anomalous (for example a canvas or video effect no DOM read can see), and each exception is named in
   `scripts/parity/GAP-CHECKLIST.md` with how it is checked instead. Each extension gets a negative control
   (`--inject-live-css`) that turns it red.
5. **Re-run** until the walker reaches the hand-read diff or better on both copies. Its report is then the one
   clear diff per copy: structure, contents, styling and behaviour of every element.
**Steps 1 to 5 done (2026-09-28):** hand-read diff and step 2-5 comparison `reports/visual-diff/u18-hand-read-diff-2026-09-27.md`;
walker header mode (`scripts/parity/GAP-CHECKLIST.md` section 11); walker reports
`reports/visual-diff/u18-walker-{indus,lamalama}-2026-09-28.md`. Decided (Bean, 2026-09-28): the Indus reference is the
draft's source intent: panel entrance 340ms from `translateY(-8px) scale(.99)`, links rising 460ms 26ms apart (max 320ms),
drawer items sliding in 420ms 55ms apart. It is not compared against the draft (which never plays it); the copy's motion
is proved by its own timeline read against those declared values.

6. **Then fix**, from that diff only: sort each row into composition or framework capability, and plan the fixes.
   No fixing happens before step 5 closes.

## Questions the method must settle

1. **What is the reference, as data?** Indus: the draft file and its stylesheet, parsed rule by rule into every
   element's styles, hover and motion. lamalama: the live site, captured as computed styles, hover end states and
   running motion per element.
2. **Can `draft-live-walk.mjs` drive a header** (hover each item, open each panel, open the drawer, read the
   transitions) at 375, 768 and 1440 against a reference on another origin? What does it lack: viewport-scaled
   (`vw`/`clamp`) sizing checked across widths, text scramble, staggered entrances, media in the drawer?
3. **An element inventory before composing:** every element in the reference, in order, with its styles, hover and
   motion. Each row ends as reproduced, accepted with a reason Bean signed, or a named framework gap.
4. **Which gaps are framework capabilities** (a viewport-fluid pill scale, a label that opens the drawer, a
   per-item hover marker, scramble on drawer buttons, a slide-open drawer, a staggered item fade, a media circle in
   the drawer) and which are composition only.
5. **Does the method generalise** to the cloning pipeline (`/sgs-clone`), so every future copy is captured this way?

## Exit

The walker (with its header/footer mode) matches or beats the hand-read diff, then exits 0 on both copies at 375, 768 and 1440 after the fixes, or every open row is an accepted difference Bean signed;
Bean's eye passes both (R-31-13). Then Gate 3C item 4 is re-assessed in the parent plan §7, the track doc and LEDGER.
